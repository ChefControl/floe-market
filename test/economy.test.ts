// The fish side of the chain (fish -> slices -> counters or the chefs), the runner, the sled window and the takeout kiosk.
import type { Mesh, MeshLambertMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame, MARKET } from './helpers';

describe('fishing', () => {
  it('reels a fish to the block and chops it into three slices', async () => {
    const g = await loadGame();
    const fish = g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'player');
    expect(fish?.state).toBe('hooked');
    g.run(3);
    expect(g.stations.pile.items).toHaveLength(3);
    expect(g.items.kindOf(g.stations.pile.items[0])).toBe('fish');
    g.run(3);
    expect(fish?.state).toBe('swim'); // respawned
  });

  it("won't hook a fish the pile has no room for", async () => {
    const g = await loadGame({ pile: 52 });
    expect(g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'player')).toBeNull();
  });

  it('ignores fish out of range', async () => {
    const g = await loadGame();
    expect(g.fishing.tryCatch(() => g.util.V(100, 1, 100), 'turret')).toBeNull();
  });
});

describe('steak counter', () => {
  it('serves a queued customer from stock, takes payment, and sends them home', async () => {
    const g = await loadGame({ c1: 10 });
    const { C1 } = g.counters;
    g.runUntil(() => C1.queue.length > 0);
    const first = C1.queue[0];
    g.runUntil(() => C1.cash.items.length >= first.want);
    expect(first.got).toBe(first.want);
    expect(g.cashAt(C1)).toBe(first.want * C1.price);
    expect(first.bubble.visible).toBe(false);
    g.runUntil(() => first.g.parent === null);
    expect(first.hands.items).toHaveLength(0);
  });

  it('keeps a customer waiting with an order bubble when out of stock', async () => {
    const g = await loadGame();
    const { C1 } = g.counters;
    g.runUntil(() => C1.queue[0]?.arrived === true);
    g.run(1);
    expect(C1.queue[0].bubble.visible).toBe(true);
    expect(C1.cash.items).toHaveLength(0);
  });
});

describe('sled window', () => {
  it('sells steaks in bulk to snowmobiles on the road', async () => {
    const g = await loadGame({ tiles: bought('sled'), c2: 12 });
    const { SLED } = g.counters;
    g.runUntil(() => SLED.queue.length > 0);
    const sled = SLED.queue[0];
    g.runUntil(() => SLED.cash.items.length >= sled.want);
    expect(g.cashAt(SLED)).toBe(sled.want * 6);
    g.placePlayer(SLED.cashPos.x, SLED.cashPos.z);
    g.run(1);
    expect(g.wallet.money).toBe(sled.want * 6);
  });
});

describe('runner', () => {
  it('works side by side with the others, each in their own shirt', async () => {
    const g = await loadGame({ tiles: bought('runner', 'runner2', 'runner3', 'sushi'), pile: 30 });
    const rs = g.runner.runners;
    expect(rs).toHaveLength(3);
    const shirt = (r: (typeof rs)[number]) => ((r.g.arms[0].children[0] as Mesh).material as MeshLambertMaterial).color.getHex();
    expect(new Set(rs.map(shirt)).size).toBe(3);
    g.runUntil(() => rs.every(r => r.state === 'unload'), 20);
    const xs = rs.map(r => r.g.position.x);
    expect(Math.min(...xs.slice(1).map(x => Math.abs(x - xs[0])))).toBeGreaterThan(0.6); // not on top of each other
    g.runUntil(() => g.restaurant.fishTray.n >= 24, 20);
  });

  it('stocks whichever counter is lowest', async () => {
    const g = await loadGame({ tiles: bought('sled'), pile: 6, c1: 20 });
    const { C1, SLED } = g.counters;
    g.runner.hireRunner();
    g.runUntil(() => SLED.stock.items.length === 6);
    expect(C1.stock.n).toBeLessThanOrEqual(20);
  });

  it('heads for the kitchen line instead when the counters close under it', async () => {
    const g = await loadGame({ tiles: bought(...MARKET), pile: 8 });
    const r = g.runner.runners[0];
    g.runUntil(() => r.state === 'unload', 20);
    g.unlocks.applyUnlock('sushi');
    g.run(0.05);
    expect(r.state).toBe('toTarget');
    g.runUntil(() => g.restaurant.fishTray.n > 0, 20);
  });

  it('carries a partial load to the fish tray after waiting at an empty pile', async () => {
    const g = await loadGame({ tiles: bought('sushi'), pile: 3 });
    const { fishTray } = g.restaurant;
    const r = g.runner.hireRunner();
    g.runUntil(() => fishTray.items.length === 3);
    g.run(0.1);
    expect(r.back.n).toBe(0);
    expect(r.state).toBe('toPile');
    expect(g.stations.pile.items).toHaveLength(0);
  });

  it('waits with its load while the tray is full', async () => {
    const g = await loadGame({ tiles: bought('sushi'), pile: 4, fish: 48 });
    const r = g.runner.hireRunner();
    g.runUntil(() => r.state === 'unload');
    g.run(2);
    expect(r.back.n).toBe(4);
  });
});

describe('takeout kiosk', () => {
  const open = (boxes: number, extra = {}) => loadGame({ tiles: bought('sushi', 'kiosk'), boxes, ...extra });

  it('sells packed boxes to snowmobiles, who pay and drive off', async () => {
    const g = await open(10);
    const { TAKEOUT } = g.counters;
    g.restaurant.sushi.spawnT = Infinity;
    g.runUntil(() => TAKEOUT.queue.length > 0);
    const sled = TAKEOUT.queue[0];
    g.runUntil(() => TAKEOUT.cash.items.length >= sled.want);
    expect(g.cashAt(TAKEOUT)).toBe(sled.want * TAKEOUT.price);
    expect(sled.bubble.visible).toBe(false);
    g.runUntil(() => sled.g.parent === null);
    expect(sled.hands.items).toHaveLength(0);
  });

  it('keeps a snowmobile waiting with an order bubble when out of boxes', async () => {
    const g = await open(0);
    const { TAKEOUT } = g.counters;
    g.runUntil(() => TAKEOUT.queue[0]?.arrived === true);
    g.run(1);
    expect(TAKEOUT.queue[0].bubble.visible).toBe(true);
    expect(TAKEOUT.cash.items).toHaveLength(0);
  });

  it('folds payment into the top bill when the cash stack is full', async () => {
    const g = await open(10, { tcash: 35 });
    const { TAKEOUT } = g.counters;
    TAKEOUT.cash.cap = TAKEOUT.cash.items.length;
    g.runUntil(() => TAKEOUT.queue.length > 0);
    const first = TAKEOUT.queue[0];
    g.runUntil(() => g.cashAt(TAKEOUT) > 35);
    expect(TAKEOUT.cash.items).toHaveLength(1);
    expect(g.cashAt(TAKEOUT)).toBe(35 + first.want * 35);
  });

  it('the chefs pack every other order into a box while the kiosk has room', async () => {
    const g = await loadGame({ tiles: bought('sushi', 'kiosk'), fish: 4, rice: 4 });
    const { TAKEOUT } = g.counters, { sushi } = g.restaurant;
    TAKEOUT.maxQ = 0;
    sushi.spawnT = Infinity; // no diners to eat the plates
    g.runUntil(() => TAKEOUT.stock.items.length === 2 && sushi.slots.filter(Boolean).length === 2, 20);
    expect(g.cashAt({ cash: TAKEOUT.stock })).toBe(70);
  });
});
