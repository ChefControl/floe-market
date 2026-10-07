// Per-device progress: what's saved, migration, damaged saves, and multiple tabs.
import { describe, expect, it, vi } from 'vitest';
import { bought, loadGame } from './helpers';

const KEY = 'floe-market-v1';
const stored = () => JSON.parse(localStorage.getItem(KEY)!);

describe('saving progress', () => {
  it('round-trips everything through a reload', async () => {
    const tiles = [...bought('pack', 'sled'), { id: 'turret', paid: 20, done: false }];
    const g1 = await loadGame({ money: 50, tiles, pile: 5, back: 4, c1: 3, c2: 2, c1c: 12, c2c: 18 });
    g1.saveMod.save();
    expect(stored().v).toBe(3);

    const g2 = await loadGame(localStorage.getItem(KEY)!);
    expect(g2.wallet.money).toBe(50);
    expect(g2.player.back.cap).toBe(14);
    expect(g2.unlocks.tiles.find(t => t.id === 'turret')!.paid).toBe(20);
    expect(g2.stations.pile.items).toHaveLength(5);
    expect(g2.player.back.items).toHaveLength(4);
    expect(g2.counters.C1.stock.items).toHaveLength(3);
    expect(g2.counters.C2.stock.items).toHaveLength(2);
    expect(g2.cashAt(g2.counters.C1)).toBe(12);
    expect(g2.cashAt(g2.counters.C2)).toBe(18);
  });

  it('counts cash and steaks that are still in the air', async () => {
    const g = await loadGame({ c1c: 8 });
    const { C1 } = g.counters;
    g.placePlayer(C1.cashPos.x, C1.cashPos.z);
    g.run(0.05); // bills are flying to the player
    expect(g.wallet.money).toBeLessThan(8);
    g.fishing.tryCatch(() => g.util.V(-4.5, 1, -5.2), 'turret'); // a fish is being reeled in
    g.saveMod.save();
    expect(stored()).toMatchObject({ money: 8, pile: 3 });
  });

  it('puts back steaks the runner or unpaid customers are holding', async () => {
    const g = await loadGame({ tiles: bought('runner'), pile: 3, c1: 5 });
    const { C1 } = g.counters;
    g.runUntil(() => g.runner.runner!.back.items.length === 3);
    g.runUntil(() => (C1.queue[0]?.hands.n ?? 0) > 0);
    g.saveMod.save();
    expect(stored()).toMatchObject({ pile: 3, c1: 5 });
  });
});

describe('loading', () => {
  it('upgrades and sanitises older saves', async () => {
    const { saveMod } = await loadGame();
    const s = saveMod.migrate({ money: '12', tiles: [{ id: 'pack', paid: 25, done: true }, null], pile: -3 });
    expect(s).toMatchObject({ v: 3, money: 12, pile: 0, back: 0, tiles: [{ id: 'pack', paid: 25, done: true, open: false }] });
    expect(() => saveMod.migrate('nope')).toThrow();
    expect(() => saveMod.migrate([])).toThrow();
  });

  it('backs up an unreadable save instead of overwriting it', async () => {
    const g = await loadGame('{broken');
    expect(localStorage.getItem('floe-market-backup')).toBe('{broken');
    g.saveMod.save();
    expect(stored().v).toBe(3);
    expect(localStorage.getItem('floe-market-backup')).toBe('{broken');
  });

  it('keeps going when storage is unavailable', async () => {
    const g = await loadGame({ money: 3 });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => g.saveMod.save()).not.toThrow();
    expect(() => g.saveMod.wipeSave()).not.toThrow();
    expect(g.saveMod.load()).toBe(false);
  });
});

describe('several tabs', () => {
  it('stops saving once another tab has saved', async () => {
    const g = await loadGame({ money: 5 });
    g.saveMod.save();
    localStorage.setItem(KEY, 'newer progress from another tab');
    g.saveMod.save();
    expect(localStorage.getItem(KEY)).toBe('newer progress from another tab');
    expect(g.saveMod.isStale()).toBe(true);
    expect(document.getElementById('stale')!.hidden).toBe(false);
  });
});

describe('storage durability', () => {
  it('asks the browser to keep storage once the player has made progress', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(true) };
    Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
    const g = await loadGame({ money: 5 });
    g.saveMod.save();
    expect(storage.persisted).not.toHaveBeenCalled();
    g.unlocks.tiles[0].paid = 1;
    g.saveMod.save();
    g.saveMod.save();
    await vi.waitFor(() => expect(storage.persist).toHaveBeenCalledOnce());
  });
});
