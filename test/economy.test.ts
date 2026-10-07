// The production chain: fish -> steaks -> counters -> customers -> cash, plus the runner.
import { describe, expect, it } from 'vitest';
import { bought, loadGame } from './helpers';

describe('fishing', () => {
  it('reels a fish to the block and chops it into three steaks', async () => {
    const g = await loadGame();
    const fish = g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'player');
    expect(fish?.state).toBe('hooked');
    g.run(3);
    expect(g.stations.pile.items).toHaveLength(3);
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

describe('counters', () => {
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

  it('folds payment into the top bill when the cash stack is full', async () => {
    const g = await loadGame({ c1: 10, c1c: 8 });
    const { C1 } = g.counters;
    C1.cash.cap = C1.cash.items.length;
    g.runUntil(() => C1.queue.length > 0);
    const first = C1.queue[0];
    g.runUntil(() => g.cashAt(C1) > 8);
    expect(C1.cash.items).toHaveLength(2);
    expect(g.cashAt(C1)).toBe(8 + first.want * C1.price);
  });

  it('serves snowmobiles at the sled window once it is bought', async () => {
    const g = await loadGame({ tiles: bought('sled'), c2: 10 });
    const { C2 } = g.counters;
    g.runUntil(() => C2.queue.length > 0);
    const sled = C2.queue[0];
    g.runUntil(() => C2.cash.items.length >= sled.want);
    expect(g.cashAt(C2)).toBe(sled.want * C2.price);
  });
});

describe('runner', () => {
  it('carries a partial load to the counter after waiting at an empty pile', async () => {
    const g = await loadGame({ pile: 3 });
    const { C1 } = g.counters;
    C1.maxQ = 0;
    const r = g.runner.hireRunner();
    g.runUntil(() => C1.stock.items.length === 3);
    g.run(0.1);
    expect(r.back.n).toBe(0);
    expect(r.state).toBe('toPile');
    expect(g.stations.pile.items).toHaveLength(0);
  });

  it('stocks whichever open counter has the least', async () => {
    const g = await loadGame({ tiles: bought('sled'), pile: 8, c1: 5 });
    const { C1, C2 } = g.counters;
    C1.maxQ = C2.maxQ = 0;
    g.runner.hireRunner();
    g.runUntil(() => C2.stock.items.length === 8);
    expect(C1.stock.items).toHaveLength(5);
  });
});
